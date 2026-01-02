
'use client';

import React, { useState } from 'react';
import { useDigitAnalysis } from '@/context/digit-analysis-context';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';

export function OverUnderAnalysis() {
    const [barrier, setBarrier] = useState(4);
    const { getOverUnder } = useDigitAnalysis();
    
    const { over, under, overCount, underCount } = getOverUnder(barrier);
    const overPercentage = parseFloat(over);
    const underPercentage = parseFloat(under);

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Over/Under Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-6">
                    <span className="text-sm font-medium">Barrier:</span>
                    <Slider
                        value={[barrier]}
                        onValueChange={(value) => setBarrier(value[0])}
                        min={0}
                        max={9}
                        step={1}
                        className="w-[70%]"
                    />
                    <span className="text-lg font-bold p-2 rounded-md bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center">{barrier}</span>
                </div>
                
                <div>
                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-green-500">Over {barrier}</span>
                            <span className="text-sm font-medium text-green-500">{over} ({overCount})</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-4">
                            <div className="bg-green-500 h-4 rounded-full" style={{ width: `${overPercentage}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-red-500">Under {barrier}</span>
                            <span className="text-sm font-medium text-red-500">{under} ({underCount})</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-4">
                            <div className="bg-red-500 h-4 rounded-full" style={{ width: `${underPercentage}%` }}></div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
