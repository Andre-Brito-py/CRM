import React from 'react';

const CustomFieldsRenderer = ({ fields, values, onChange, area }) => {
  if (!fields || fields.length === 0) return null;

  const filteredFields = fields.filter(
    (field) => field.area === 'both' || field.area === area || !field.area
  );

  if (filteredFields.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-gray-200 mt-4">
      <h4 className="text-sm font-medium text-gray-900">Custom Fields</h4>
      {filteredFields.map((field) => {
        const value = values[field.key] || '';
        const handleChange = (e) => onChange(field.key, e.target.value);
        const handleCheckboxChange = (e) => onChange(field.key, e.target.checked);

        return (
          <div key={field.key}>
            <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && '*'}
            </label>
            
            {field.type === 'text' && (
              <input
                type="text"
                id={field.key}
                required={field.required}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={value}
                onChange={handleChange}
              />
            )}
            
            {field.type === 'number' && (
              <input
                type="number"
                id={field.key}
                required={field.required}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={value}
                onChange={handleChange}
              />
            )}
            
            {field.type === 'date' && (
              <input
                type="date"
                id={field.key}
                required={field.required}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={value}
                onChange={handleChange}
              />
            )}

            {field.type === 'currency' && (
              <div className="relative mt-1 border border-gray-300 rounded focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  id={field.key}
                  required={field.required}
                  className="block w-full rounded-md border-0 py-2 pl-7 text-gray-900 ring-0 focus:ring-0 sm:text-sm"
                  placeholder="0.00"
                  value={value}
                  onChange={handleChange}
                />
              </div>
            )}
            
            {(field.type === 'url' || field.type === 'phone') && (
              <input
                type={field.type === 'url' ? 'url' : 'tel'}
                id={field.key}
                required={field.required}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={value}
                onChange={handleChange}
              />
            )}

            {field.type === 'select' && (
              <select
                id={field.key}
                required={field.required}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={value}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                {field.options?.split(',').map((opt) => (
                  <option key={opt.trim()} value={opt.trim()}>
                    {opt.trim()}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'multi-select' && (
               <select
                 id={field.key}
                 required={field.required && (!value || value.length === 0)}
                 multiple
                 className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                 value={value || []}
                 onChange={(e) => {
                   const selected = Array.from(e.target.selectedOptions, option => option.value);
                   onChange(field.key, selected);
                 }}
               >
                 {field.options?.split(',').map((opt) => (
                   <option key={opt.trim()} value={opt.trim()}>
                     {opt.trim()}
                   </option>
                 ))}
               </select>
            )}

            {field.type === 'checkbox' && (
              <div className="relative flex items-start mt-2">
                <div className="flex h-5 items-center">
                  <input
                    id={field.key}
                    type="checkbox"
                    required={field.required}
                    checked={!!value}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CustomFieldsRenderer;
