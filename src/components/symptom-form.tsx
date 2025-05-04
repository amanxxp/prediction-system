'use client';

import type { Symptom, MedicalHistory, PatientProfile } from '@/services/medical-diagnosis';
import type { AnalyzeSymptomsInput, AnalyzeSymptomsOutput } from '@/ai/flows/analyze-symptoms';
import { useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { analyzeSymptoms } from '@/ai/flows/analyze-symptoms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { DiagnosisResults } from '@/components/diagnosis-results';
import { useToast } from "@/hooks/use-toast";
import { ProfileInfoStep } from '../components/symptom-checker/profile-info-step';
import { SymptomsStep } from '../components/symptom-checker/symptoms-step';
import { MedicalImageStep } from '../components/symptom-checker/medical-image-step';
import { MedicalHistoryStep } from '../components/symptom-checker/medical-history-step';
import { Progress } from '@/components/ui/progress';

// Define Zod schema based on AnalyzeSymptomsInputSchema for client-side validation
const symptomSchema = z.object({
  name: z.string().min(1, 'Symptom name is required.'),
  severity: z.string().min(1, 'Severity is required.'),
});

const medicalHistorySchema = z.object({
  pastConditions: z.string().optional(),
  currentMedications: z.string().optional(),
});

// Define max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Define accepted image types
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/dicom"];

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  age: z.coerce.number().int().positive('Age must be a positive number.').min(1, 'Age is required.'),
  weight: z.coerce.number().positive('Weight must be positive').optional(),
  weightUnit: z.string().optional(),
  height: z.coerce.number().positive('Height must be positive').optional(),
  heightUnit: z.string().optional(),
  gender: z.string().min(1, 'Gender is required.'),
  symptoms: z.array(symptomSchema).min(1, 'Please add at least one symptom.'),
  medicalHistory: medicalHistorySchema,
  medicalImage: z
    .custom<FileList>()
    .refine(files => files === undefined || files === null || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max image size is 10MB.`)
    .refine(
      files => files === undefined || files === null || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png, .webp and .dicom formats are supported."
    )
    .optional(),
  imageDescription: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
}).refine(data => (data.weight ? !!data.weightUnit : true), {
    message: "Weight unit is required if weight is provided.",
    path: ["weightUnit"],
}).refine(data => (data.height ? !!data.heightUnit : true), {
    message: "Height unit is required if height is provided.",
    path: ["heightUnit"],
}).refine(data => (data.medicalImage && data.medicalImage.length > 0 ? !!data.imageDescription : true), {
    message: "Please provide a description for the uploaded image.",
    path: ["imageDescription"],
});

export type FormData = z.infer<typeof formSchema>;
// Define steps for the multi-step form
const steps = [
  { id: 'profile', title: 'Your Information' },
  { id: 'symptoms', title: 'Symptoms' },
  { id: 'medical-image', title: 'Medical Image (Optional)' },
  { id: 'medical-history', title: 'Medical History (Optional)' },
  { id: 'review', title: 'Review & Submit' },
];

export function SymptomForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalyzeSymptomsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      age: undefined,
      weight: undefined,
      weightUnit: undefined,
      height: undefined,
      heightUnit: undefined,
      gender: '',
      symptoms: [{ name: '', severity: '' }],
      medicalHistory: {
        pastConditions: '',
        currentMedications: '',
      },
      medicalImage: undefined,
      imageDescription: '',
    },
    mode: "onChange",
  });

  // Update progress bar when step changes
  useEffect(() => {
    setProgress(((currentStep + 1) / steps.length) * 100);
  }, [currentStep]);

  // Function to convert File to Data URI
  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const goToNextStep = async () => {
    const stepId = steps[currentStep].id;
    
    if (stepId === 'profile') {
      // Validate only the profile fields
      const profileValid = await methods.trigger(['name', 'age', 'gender', 'weight', 'weightUnit', 'height', 'heightUnit']);
      if (!profileValid) return;
    } else if (stepId === 'symptoms') {
      // Validate only the symptoms fields
      const symptomsValid = await methods.trigger('symptoms');
      if (!symptomsValid) return;
    } else if (stepId === 'medical-image') {
      // No validation needed for optional image, just check if there are any errors
      const imageErrors = methods.formState.errors.medicalImage;
      if (imageErrors) return;
    } else if (stepId === 'medical-history') {
      // No validation needed for optional medical history
      // Just proceed
    }

    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const skipStep = () => {
    // Only allow skipping optional steps
    const stepId = steps[currentStep].id;
    if (stepId === 'medical-image' || stepId === 'medical-history') {
      setCurrentStep(prev => prev + 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    let imageDataUri: string | undefined = undefined;
    if (data.medicalImage && data.medicalImage.length > 0) {
      try {
        imageDataUri = await fileToDataUri(data.medicalImage[0]);
      } catch (err) {
        console.error("Error converting image to Data URI:", err);
        setError("Failed to process the uploaded image. Please try again.");
        setIsLoading(false);
        return;
      }
    }

    // Prepare data for the AI flow
    const formattedMedicalHistory: MedicalHistory = {
      pastConditions: data.medicalHistory.pastConditions?.split(',').map(s => s.trim()).filter(s => s) ?? [],
      currentMedications: data.medicalHistory.currentMedications?.split(',').map(s => s.trim()).filter(s => s) ?? [],
    };

    const input: AnalyzeSymptomsInput = {
      name: data.name,
      age: data.age,
      weight: data.weight,
      weightUnit: data.weightUnit,
      height: data.height,
      heightUnit: data.heightUnit,
      gender: data.gender,
      symptoms: data.symptoms,
      medicalHistory: formattedMedicalHistory,
      imageDataUri: imageDataUri,
    };

    try {
      const diagnosisResults = await analyzeSymptoms(input);
      setResults(diagnosisResults);
    } catch (err) {
      console.error('Error analyzing symptoms:', err);
      setError('An error occurred while analyzing symptoms. The AI model might have limitations with image analysis or the input provided. Please ensure the image is clear and relevant, or try removing it. If the problem persists, contact support.');
      toast({
        variant: "destructive",
        title: "Analysis Error",
        description: "Failed to get analysis from the AI. Check console for details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render the current step content based on the step index
  const renderStepContent = () => {
    const stepId = steps[currentStep].id;

    switch (stepId) {
      case 'profile':
        return <ProfileInfoStep />;
      case 'symptoms':
        return <SymptomsStep />;
      case 'medical-image':
        return <MedicalImageStep imagePreview={imagePreview} setImagePreview={setImagePreview} />;
      case 'medical-history':
        return <MedicalHistoryStep />;
      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Review Your Information</h3>
            <div className="space-y-4">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium mb-2">Personal Information</h4>
                <p>Name: {methods.getValues('name')}</p>
                <p>Age: {methods.getValues('age')}</p>
                <p>Gender: {methods.getValues('gender')}</p>
                {methods.getValues('weight') && (
                  <p>Weight: {methods.getValues('weight')} {methods.getValues('weightUnit')}</p>
                )}
                {methods.getValues('height') && (
                  <p>Height: {methods.getValues('height')} {methods.getValues('heightUnit')}</p>
                )}
              </div>
              
              <div className="p-4 border rounded-md">
                <h4 className="font-medium mb-2">Symptoms</h4>
                <ul className="list-disc pl-5">
                  {methods.getValues('symptoms').map((symptom, index) => (
                    <li key={index}>
                      {symptom.name} - {symptom.severity}
                    </li>
                  ))}
                </ul>
              </div>
              
              {imagePreview && (
                <div className="p-4 border rounded-md">
                  <h4 className="font-medium mb-2">Medical Image</h4>
                  <p>Image uploaded</p>
                </div>
              )}
              
              {(methods.getValues('medicalHistory.pastConditions') || methods.getValues('medicalHistory.currentMedications')) && (
                <div className="p-4 border rounded-md">
                  <h4 className="font-medium mb-2">Medical History</h4>
                  {methods.getValues('medicalHistory.pastConditions') && (
                    <div>
                      <p className="font-medium text-sm">Past Conditions:</p>
                      <p>{methods.getValues('medicalHistory.pastConditions')}</p>
                    </div>
                  )}
                  {methods.getValues('medicalHistory.currentMedications') && (
                    <div className="mt-2">
                      <p className="font-medium text-sm">Current Medications:</p>
                      <p>{methods.getValues('medicalHistory.currentMedications')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (results) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <Button variant="outline" onClick={() => {
          setResults(null);
          methods.reset();
          setCurrentStep(0);
          setImagePreview(null);
        }}>
          Start New Assessment
        </Button>
        <DiagnosisResults results={results} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <Card className="shadow-lg rounded-lg border border-border">
        <CardHeader className="bg-secondary">
          <CardTitle className="text-2xl font-semibold text-secondary-foreground">Symptom Checker</CardTitle>
          <CardDescription className="text-secondary-foreground/80">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </CardDescription>
          <Progress value={progress} className="w-full mt-2" />
        </CardHeader>
        
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 p-6">
              {renderStepContent()}
            </CardContent>
            
            <CardFooter className="flex justify-between p-6 border-t">
              <div>
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {(steps[currentStep].id === 'medical-image' || steps[currentStep].id === 'medical-history') && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={skipStep}
                  >
                    Skip
                  </Button>
                )}
                
                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={goToNextStep}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading || !methods.formState.isValid}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                      </>
                    ) : (
                      'Analyze Symptoms'
                    )}
                  </Button>
                )}
              </div>
            </CardFooter>
            
            {error && (
              <div className="px-6 pb-6">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}