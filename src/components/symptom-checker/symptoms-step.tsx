'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { FormData } from '../symptom-form';

// Severity levels for symptoms
const severityLevels = ["Mild", "Moderate", "Severe", "Very Severe"];

export function SymptomsStep() {
  const { control, formState } = useFormContext<FormData>();
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'symptoms',
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Symptoms</h3>
      <p className="text-sm text-muted-foreground">
        Please describe the symptoms you are experiencing. Add as many as needed.
      </p>

      {fields.map((field, index) => (
        <div key={field.id} className="flex items-start space-x-3 p-4 border rounded-md bg-card">
          <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={control}
              name={`symptoms.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symptom</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Headache, Fever" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`symptoms.${index}.severity`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {severityLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            className="mt-8 text-destructive hover:bg-destructive/10"
            aria-label="Remove symptom"
            disabled={fields.length <= 1}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ name: '', severity: '' })}
        className="mt-2"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Add Symptom
      </Button>

      {formState.errors.symptoms && !formState.errors.symptoms.root?.message && (
        <p className="text-sm font-medium text-destructive">
          {formState.errors.symptoms.message || "Please add at least one symptom."}
        </p>
      )}
      
      {formState.errors.symptoms?.root && (
        <p className="text-sm font-medium text-destructive">
          {formState.errors.symptoms.root.message}
        </p>
      )}
    </div>
  );
}