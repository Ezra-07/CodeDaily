import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Spinner } from './ui/spinner';

export const ProtectedRoute = ({ children }) => {
  const { authUser, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to='/login' replace />;
  }

  return children;
};