'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, LogOut, CheckCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export function ApiTokenDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    if (token) {
      // In a real app, you'd validate the token with the Deriv API
      console.log('Connecting with token:', token);
      setIsConnected(true);
      setIsOpen(false);
      toast({
        title: "Successfully Connected",
        description: "Your Deriv API token has been saved.",
      });
    } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Please enter a valid API token.",
        });
    }
  };

  const handleDisconnect = () => {
    setToken('');
    setIsConnected(false);
    toast({
        title: "Disconnected",
        description: "Your API token has been removed.",
    });
  }

  if (isConnected) {
    return (
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>API Connected</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
            </Button>
        </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <KeyRound className="mr-2 h-4 w-4" /> API Token
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Deriv API Token</DialogTitle>
          <DialogDescription>
            Enter your Deriv API token to connect your account. You can create a token in your Deriv account settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="token" className="text-right">
              Token
            </Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Your Deriv API Token"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConnect}>Connect</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
