import Meta from '@/components/Meta/index';
import { LandingLayout } from '@/layouts/index';
import { Footer } from '@/sections/index';

const TermsOfUse = () => {
  return (
    <LandingLayout>
      <Meta
        title="Terms of Use - Nextacular CRM"
        description="Terms of Use for Nextacular CRM services."
      />
      <main className="max-w-4xl mx-auto px-6 py-20 text-gray-800">
        <h1 className="text-4xl font-bold mb-8">Terms of Use</h1>
        <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p className="mb-4">
          By accessing and using Nextacular CRM ("the Service"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the Service.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
        <p className="mb-4">
          Nextacular CRM provides a multi-tenant platform for customer relationship management, omnichannel messaging, and sales pipeline tracking. Features may vary based on your subscription plan.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Obligations</h2>
        <p className="mb-4">
          You must provide accurate information during registration and keep your account details secure. You are responsible for all activities that occur under your account. You agree not to use the Service for any unlawful or prohibited activities, including sending spam or violating third-party network policies (e.g., Meta's WhatsApp Business Policies).
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Payment and Subscriptions</h2>
        <p className="mb-4">
          Certain features of the Service are billed on a subscription basis. You will be billed in advance on a recurring, periodic basis. All payments are non-refundable unless otherwise required by law.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Termination</h2>
        <p className="mb-4">
          We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Limitation of Liability</h2>
        <p className="mb-4">
          In no event shall Nextacular CRM, its directors, employees, or partners, be liable for any indirect, incidental, special, consequential or punitive damages, including loss of profits, data, or goodwill, arising out of your access to or use of the Service.
        </p>
      </main>
      <Footer />
    </LandingLayout>
  );
};

export default TermsOfUse;
