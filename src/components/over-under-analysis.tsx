
'use client';

import React from 'react';
import { useDigitAnalysis } from '@/context/digit-analysis-context';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export function OverUnderAnalysis() {
    const { getOverUnder } = useDigitAnalysis();
    
    const barriers = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Over/Under Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center">Barrier</TableHead>
                            <TableHead className="text-center text-green-500">Over %</TableHead>
                            <TableHead className="text-center text-red-500">Under %</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {barriers.map(barrier => {
                            const { over, under } = getOverUnder(barrier);
                            return (
                                <TableRow key={barrier}>
                                    <TableCell className="text-center font-bold text-lg">{barrier}</TableCell>
                                    <TableCell className="text-center text-green-500 font-semibold">{over}</TableCell>
                                    <TableCell className="text-center text-red-500 font-semibold">{under}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
