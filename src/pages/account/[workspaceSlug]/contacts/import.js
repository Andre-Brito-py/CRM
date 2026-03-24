import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Papa from 'papaparse';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const ImportContacts = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    customFields: {},
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data);
          setColumns(results.meta.fields || []);
        },
      });
    }
  };

  const handleMappingChange = (field, value, isCustom = false) => {
    if (isCustom) {
      setMapping((prev) => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [field]: value,
        },
      }));
    } else {
      setMapping((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!mapping.name && !mapping.email) {
      toast.error('Please map at least Name or Email');
      return;
    }

    setIsUploading(true);

    const formattedData = data.map((row) => {
      const customFieldsData = {};
      Object.keys(mapping.customFields).forEach((key) => {
        if (mapping.customFields[key]) {
          customFieldsData[key] = row[mapping.customFields[key]];
        }
      });

      return {
        name: row[mapping.name],
        email: row[mapping.email],
        phone: row[mapping.phone],
        jobTitle: row[mapping.jobTitle],
        customFields: customFieldsData,
      };
    }).filter(c => c.name || c.email);

    try {
      await api(`/api/workspace/${workspace.slug}/contacts/import`, {
        method: 'POST',
        body: { contacts: formattedData },
      });
      toast.success('Contacts imported successfully');
      router.push(`/account/${workspace.slug}/contacts`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to import contacts');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AccountLayout>
      <Head>
        <title>Import Contacts | Vysify</title>
      </Head>
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Import Contacts</h1>

        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ArrowUpTrayIcon className="w-8 h-8 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </div>
                <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
              </label>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600 flex items-center">
                <DocumentTextIcon className="w-4 h-4 mr-1" />
                {file.name} ({data.length} rows)
              </p>
            )}
          </div>

          {columns.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Map Columns</h2>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                    value={mapping.name}
                    onChange={(e) => handleMappingChange('name', e.target.value)}
                  >
                    <option value="">Select column...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                    value={mapping.email}
                    onChange={(e) => handleMappingChange('email', e.target.value)}
                  >
                    <option value="">Select column...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                    value={mapping.phone}
                    onChange={(e) => handleMappingChange('phone', e.target.value)}
                  >
                    <option value="">Select column...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Job Title</label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                    value={mapping.jobTitle}
                    onChange={(e) => handleMappingChange('jobTitle', e.target.value)}
                  >
                    <option value="">Select column...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                {workspace?.customFieldDefinitions?.map((field) => (
                  <div key={field.key} className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">{field.label} ({field.type})</label>
                    <select
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                      value={mapping.customFields[field.key] || ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value, true)}
                    >
                      <option value="">Select column...</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 mr-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isUploading || !file}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${(isUploading || !file) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isUploading ? 'Importing...' : 'Import Contacts'}
            </button>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};

export default ImportContacts;
