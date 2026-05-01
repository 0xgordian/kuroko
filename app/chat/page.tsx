import { redirect } from 'next/navigation';

// /chat redirects to the main AI page at /
// All AI chat functionality lives at app/page.tsx
export default function ChatPage() {
  redirect('/');
}
