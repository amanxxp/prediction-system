'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { FormData } from '../symptom-form';

export function MedicalHistoryStep() {
  const { control } = useFormContext<FormData>();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Medical History (Optional)</h3>
      <p className="text-sm text-muted-foreground">
        Providing your medical history can help with more accurate diagnosis. This information is optional.
      </p>

      <FormField
        control={control}
        name="medicalHistory.pastConditions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Past Conditions</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="e.g., Asthma, Diabetes (comma-separated)" 
                {...field} 
                className="min-h-24"
              />
            </FormControl>
            <FormDescription>
              Enter any relevant past medical conditions, separated by commas.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="medicalHistory.currentMedications"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Current Medications</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="e.g., Ibuprofen, Metformin (comma-separated)" 
                {...field} 
                className="min-h-24"
              />
            </FormControl>
            <FormDescription>
              List any medications you are currently taking, separated by commas.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="mt-6 p-4 bg-muted/50 rounded-md">
        <h4 className="text-sm font-medium mb-2">Why share your medical history?</h4>
        <p className="text-sm text-muted-foreground">
          Your medical history provides important context that can help identify:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2">
          <li>Potential interactions between medications and symptoms</li>
          <li>Chronic conditions that might be contributing to current symptoms</li>
          <li>Risk factors based on previous diagnoses</li>
          <li>Patterns in your health that might not be apparent otherwise</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          This information is entirely optional but can lead to more accurate results.
        </p>
      </div>
    </div>
  );
}