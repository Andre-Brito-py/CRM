import Meta from '@/components/Meta/index';
import { LandingLayout } from '@/layouts/index';
import { Footer } from '@/sections/index';

const PrivacyPolicy = () => {
  return (
    <LandingLayout>
      <Meta
        title="Privacy Policy - Nextacular CRM"
        description="Privacy Policy for Nextacular CRM services."
      />
      <main className="max-w-4xl mx-auto px-6 py-20 text-gray-800">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
        <p className="mb-4">
          We collect information you provide directly to us when you create an account, such as your name, email address, and billing information. We also collect data regarding your customers and interactions (e.g., WhatsApp messages) as part of our core CRM functionality.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">
          The information we collect is used to:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Provide, maintain, and improve our Service.</li>
          <li>Process transactions and send related information, including receipts and invoices.</li>
          <li>Send administrative messages, security alerts, and technical notices.</li>
          <li>Facilitate interactions with third-party APIs (e.g., OpenAI, Meta Graph API) as requested by your usage of the platform.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Sharing and Subprocessors</h2>
        <p className="mb-4">
          We do not sell your personal data. We may share data with trusted third-party service providers (Subprocessors) to help us operate our business, such as payment gateways (Stripe), email providers, and cloud hosting infrastructure. These partners are required to use the data only for the provision of services to us in a manner consistent with this Privacy Policy.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Security</h2>
        <p className="mb-4">
          We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Your Rights</h2>
        <p className="mb-4">
          Depending on your location (e.g., GDPR, CCPA, LGPD), you may have the right to request access, correction, or deletion of your personal data. You can exercise these rights by contacting our support team or managing your account settings.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Contact Us</h2>
        <p className="mb-4">
          If you have any questions about this Privacy Policy, please contact us at privacy@nextacular-crm.com.
        </p>
      </main>
      <Footer />
    </LandingLayout>
  );
};

export default PrivacyPolicy;
