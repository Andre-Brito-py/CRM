import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/compat/router';

export default function PublicWebForm() {
  const router = useRouter();
  const { slug } = router?.query || {};
  
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    
    const fetchForm = async () => {
      try {
        const res = await fetch(`/api/public/web-forms/${slug}`);
        const result = await res.json();
        if (res.ok) {
          setForm(result.data.webForm);
        } else {
          setError(result.error?.msg || 'Form not found');
        }
      } catch (err) {
        setError('Error loading form');
      } finally {
        setLoading(false);
      }
    };
    
    fetchForm();
  }, [slug]);

  const handleChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`/api/public/web-forms/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      
      if (res.ok) {
        setSubmitted(true);
      } else {
        alert(result.error?.msg || 'Error submitting form');
      }
    } catch (err) {
      alert('Network error submitting form');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-red-500 bg-red-50 p-4 rounded-lg shadow">{error}</div></div>;
  if (!form) return null;

  const config = typeof form.config === 'string' ? JSON.parse(form.config) : (form.config || []);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Head>
          <title>{form.name}</title>
        </Head>
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{form.successMessage || 'Obrigado!'}</h2>
          <p className="text-gray-500">Formulário enviado com sucesso para {form.workspace?.name}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <Head>
        <title>{form.name}</title>
      </Head>
      
      <div className="max-w-xl w-full">
        {form.workspace?.name && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{form.workspace.name}</h1>
            <h2 className="text-xl text-gray-600 mt-2">{form.name}</h2>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
          {config.map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-3 border"
                  rows={4}
                />
              ) : field.type === 'email' ? (
                 <input
                  type="email"
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-3 border"
                />
              ) : field.type === 'tel' ? (
                 <input
                  type="tel"
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-3 border"
                />
              ) : (
                <input
                  type="text"
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-3 border"
                />
              )}
            </div>
          ))}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Enviando...' : (form.submitText || 'Submeter')}
            </button>
          </div>
        </form>
        <div className="mt-8 text-center text-xs text-gray-400">
          Powered by Vysify
        </div>
      </div>
    </div>
  );
}
