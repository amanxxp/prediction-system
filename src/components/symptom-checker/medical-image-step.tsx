"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormControl,
  FormDescription,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUp, X, Info } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FormData } from "../symptom-form";

// Define max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Define accepted image types
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/dicom",
];

interface MedicalImageStepProps {
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
}

export function MedicalImageStep({
  imagePreview,
  setImagePreview,
}: MedicalImageStepProps) {
  const { control, setValue, clearErrors, setError, formState, watch } =
    useFormContext<FormData>();
  const { toast } = useToast();

  // Watch the medical image to show/hide description field
  const medicalImage = watch("medicalImage");
  const hasImage = medicalImage && medicalImage.length > 0;

  const handleImageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Validate file type and size client-side before setting preview
        if (file.size > MAX_FILE_SIZE) {
          setError("medicalImage", {
            type: "manual",
            message: `Max image size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
          });
          setImagePreview(null);
          setValue("medicalImage", undefined, { shouldValidate: true });
          event.target.value = ""; // Reset file input
          return;
        }

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          setError("medicalImage", {
            type: "manual",
            message:
              "Only .jpg, .jpeg, .png, .webp and .dicom formats are supported.",
          });
          setImagePreview(null);
          setValue("medicalImage", undefined, { shouldValidate: true });
          event.target.value = ""; // Reset file input
          return;
        }

        // Clear previous errors if validation passes now
        clearErrors("medicalImage");

        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          // RHF stores FileList, not the data URI directly
          // Fix the type error by ensuring we're passing FileList or undefined, not null
          const fileList =
            event.target.files && event.target.files.length > 0
              ? event.target.files
              : undefined;
          setValue("medicalImage", fileList, { shouldValidate: true });
        };
        reader.onerror = () => {
          console.error("Error reading file");
          toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected image file.",
          });
          setImagePreview(null);
          setValue("medicalImage", undefined, { shouldValidate: true });
          event.target.value = ""; // Reset file input
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
        setValue("medicalImage", undefined, { shouldValidate: true });
      }
    },
    [setValue, setError, clearErrors, setImagePreview, toast]
  );

  const removeImage = useCallback(() => {
    setImagePreview(null);
    setValue("medicalImage", undefined, {
      shouldValidate: true,
      shouldDirty: true,
    });
    // Clear the description when removing image
    setValue("imageDescription", undefined, {
      shouldValidate: true,
      shouldDirty: true,
    });
    // Reset the actual file input element
    const fileInput = document.getElementById(
      "medicalImage-input"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
    clearErrors("medicalImage");
    clearErrors("imageDescription");
  }, [setValue, clearErrors, setImagePreview]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Medical Image (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Upload an MRI, X-ray, or other relevant medical image that might help
          with diagnosis.
        </p>
      </div>

      <FormField
        control={control}
        name="medicalImage"
        render={({ field: { onChange, value, ...rest } }) => (
          <FormItem>
            <FormDescription>
              Upload an MRI, X-ray, or other relevant medical image (max 10MB).
              Supported formats: JPEG, PNG, WEBP, DICOM.
            </FormDescription>
            <FormControl>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    id="medicalImage-input"
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    onChange={handleImageChange}
                    className="hidden" // Hide default input
                    {...rest} // Pass rest of props like name, ref etc.
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("medicalImage-input")?.click()
                    }
                  >
                    <ImageUp className="mr-2 h-4 w-4" /> Upload Image
                  </Button>

                  {imagePreview && (
                    <div className="relative group">
                      <Image
                        src={imagePreview}
                        alt="Medical image preview"
                        width={80}
                        height={80}
                        className="rounded border object-cover aspect-square"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={removeImage}
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <FormField
                  control={control}
                  name="imageDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center gap-1">
                          Image Description
                          <span className="text-red-500">*</span>
                        </div>
                      </FormLabel>
                      <FormDescription>
                        Please provide details about the image (e.g., when it
                        was taken, which body part, any visible symptoms or
                        concerns)
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Example: This is an X-ray of my right knee taken on April 2, 2025. I'm concerned about the area marked with an arrow which has been causing pain."
                          className="resize-none min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {imagePreview && (
                  <p className="text-sm text-muted-foreground">
                    Image uploaded successfully. You can remove it using the
                    button above if needed.
                  </p>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
        <div className="flex items-start">
          <Info className="h-5 w-5 mr-2 text-blue-700 mt-0.5" />
          <div>
            <p className="text-sm text-blue-700 font-medium">
              Privacy Information
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Medical images help our specialists provide more accurate
              assessments. All uploaded images are encrypted and handled
              according to HIPAA guidelines. Your medical images are only
              visible to authorized healthcare providers assigned to your case.
              Images are automatically deleted 30 days after case resolution
              unless you request otherwise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
