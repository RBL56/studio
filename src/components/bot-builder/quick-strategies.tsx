import { QUICK_STRATEGIES } from '@/lib/constants';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import type { Strategy } from '@/app/page';

interface QuickStrategiesProps {
  onSelectStrategy: (strategy: Strategy) => void;
}

export function QuickStrategies({ onSelectStrategy }: QuickStrategiesProps) {
  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-xl">Quick Start Strategies</CardTitle>
            <CardDescription>
                Don't know where to start? Try one of our pre-built strategies.
            </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-1 md:grid-cols-3 gap-4">
        {QUICK_STRATEGIES.map((strategy) => (
            <Card key={strategy.name} className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg font-headline">{strategy.name}</CardTitle>
                <CardDescription className="flex-grow">{strategy.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="secondary" className="w-full" onClick={() => onSelectStrategy(strategy)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Use This Strategy
                </Button>
            </CardContent>
            </Card>
        ))}
        </CardContent>
    </Card>
  );
}
