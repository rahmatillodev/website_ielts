// import { Navigate } from 'react-router-dom';
// import { useAuthStore } from '@/store/authStore';
// import { checkPremiumExpireDate } from '@/utils/checkPremiumExpireDate';

// // Component that blocks premium users from accessing pricing page
// export default function PricingRoute({ children }) {
//   const userProfile = useAuthStore((state) => state.userProfile);
//   const loading = useAuthStore((state) => state.loading);
//   const isInitialized = useAuthStore((state) => state.isInitialized);

//   // Show loading state while checking authentication or before initialization
//   if (loading || !isInitialized) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // Check if user is premium
//   const isPremium = userProfile?.subscription_status === "premium";
//   const premiumUntil = userProfile?.premium_until;
  
//   // If user has premium status and it hasn't expired, redirect to dashboard
//   if (isPremium && checkPremiumExpireDate(premiumUntil)) {
//     return <Navigate to="/dashboard" replace />;
//   }

//   // Allow access for non-premium users or users without premium status
//   return children;
// }

