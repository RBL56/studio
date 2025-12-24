import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { BookOpen, Bot, LogIn } from 'lucide-react';
import { ApiTokenDialog } from './api-token-dialog';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image src="/deriv-logo.svg" alt="Deriv Logo" width={32} height={32} />
            <span className="font-bold font-headline sm:inline-block">
              Deriv Trading Bot
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/"
              className="transition-colors hover:text-foreground/80 text-foreground flex items-center gap-1"
            >
              <Bot className="h-4 w-4" />
              Bot Builder
            </Link>
            <Link
              href="/tutorials"
              className="transition-colors hover:text-foreground/80 text-muted-foreground flex items-center gap-1"
            >
              <BookOpen className="h-4 w-4" />
              Tutorials
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
           <ApiTokenDialog />
           <Button variant="ghost">
              <LogIn className="mr-2 h-4 w-4" />
              Log In
            </Button>
            <Button>Sign Up</Button>
        </div>
      </div>
    </header>
  );
}
