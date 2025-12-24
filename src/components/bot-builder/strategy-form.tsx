'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2 } from 'lucide-react';
import type { Strategy } from '@/app/page';
import { useEffect } from 'react';

const strategyFormSchema = z.object({
  name: z.string().min(2, 'Strategy name must be at least 2 characters.'),
  strategy: z.string().min(10, 'Strategy description must be at least 10 characters.'),
});

type StrategyFormValues = z.infer<typeof strategyFormSchema>;

interface StrategyFormProps {
  selectedStrategy: Strategy | null;
}

export function StrategyForm({ selectedStrategy }: StrategyFormProps) {
  const { toast } = useToast();
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      name: '',
      strategy: '',
    },
  });

  useEffect(() => {
    if (selectedStrategy) {
      form.reset({
        name: selectedStrategy.name,
        strategy: selectedStrategy.details,
      });
    }
  }, [selectedStrategy, form]);


  const onSubmit = async (data: StrategyFormValues) => {
    toast({
      title: "Strategy Saved",
      description: "Your strategy has been saved.",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strategy Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., RSI Overbought/Oversold" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="strategy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Describe Your Strategy</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., 'Buy when RSI crosses below 30. Sell when RSI crosses above 70.'"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Describe your entry and exit conditions in plain English.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button type="button" variant="outline">
              <FileUp className="mr-2 h-4 w-4" /> Import Strategy
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-grow">
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Strategy'
              )}
            </Button>
        </div>
      </form>
    </Form>
  );
}
