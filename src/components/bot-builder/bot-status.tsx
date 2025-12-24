'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function BotStatus() {
  const isLoading = true; // This would be state-driven in a real app

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Bot Status</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
            <p className="font-semibold text-lg">Trade placed. Waiting for result...</p>
            <p className="text-sm text-muted-foreground">Monitoring active trade.</p>
        </div>
        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
      </CardContent>
    </Card>
  );
}
