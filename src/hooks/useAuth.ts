import { useAppDispatch, useAppSelector } from '../store';
import { checkAuth, logoutUser } from '../store/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error } = useAppSelector((state) => state.auth);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    checkAuth: () => dispatch(checkAuth()),
    logout: () => dispatch(logoutUser()),
  };
};
