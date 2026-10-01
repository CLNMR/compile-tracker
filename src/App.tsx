import { RouterProvider } from 'react-router';
import { ToastProvider } from '@/components/ui';
import { Bootstrap } from '@/app/Bootstrap';
import { BootScreen } from '@/app/BootScreen';
import { ReloadPrompt } from '@/app/ReloadPrompt';
import { router } from '@/router';

export function App() {
  return (
    <ToastProvider>
      <Bootstrap fallback={<BootScreen />}>
        <RouterProvider router={router} />
      </Bootstrap>
      <ReloadPrompt />
    </ToastProvider>
  );
}
