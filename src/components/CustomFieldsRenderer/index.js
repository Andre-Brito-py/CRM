import React from 'react';

const CustomFieldsRenderer = ({ fields, values, onChange, area }) => {
  if (!fields || fields.length === 0) return null;

  const filteredFields = fields.filter(
    (field) => field.area === 'both' || field.area === area || !field.area
  );

  if (filteredFields.length === 0) return null;

  return (
    <div className="space-y-6 pt-6 border-t border-zinc-100 mt-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1.5 h-6 bg-brand-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
        <h4 className="text-[13px] font-executive font-black uppercase tracking-[0.2em] text-zinc-400">Custom Properties</h4>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {filteredFields.map((field) => {
          const value = values[field.key] || '';
          
          const handleChange = (e) => onChange(field.key, e.target.value);
          const handleCheckboxChange = (e) => onChange(field.key, e.target.checked);

          return (
            <div key={field.key} className="flex flex-col group">
              <label htmlFor={field.key} className="block text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-brand-600 transition-colors">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              <div className="relative">
                {field.type === 'text' && (
                  <input
                    type="text"
                    id={field.key}
                    required={field.required}
                    className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-xl text-[14px] font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-zinc-300"
                    value={value}
                    onChange={handleChange}
                  />
                )}
                
                {field.type === 'number' && (
                  <input
                    type="number"
                    id={field.key}
                    required={field.required}
                    className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-xl text-[14px] font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all"
                    value={value}
                    onChange={handleChange}
                  />
                )}
                
                {field.type === 'date' && (
                  <input
                    type="date"
                    id={field.key}
                    required={field.required}
                    className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-xl text-[14px] font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all"
                    value={value || ''}
                    onChange={handleChange}
                  />
                )}

                {field.type === 'currency' && (
                  <div className="relative group/input">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 bg-zinc-100/50 rounded-l-xl border-r border-zinc-100 px-3">
                      <span className="text-zinc-500 text-xs font-bold">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      id={field.key}
                      required={field.required}
                      className="block w-full h-11 pl-14 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-[14px] font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-zinc-300 ring-0 shadow-none border-0"
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
                    className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-xl text-[14px] font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-zinc-300"
                    value={value}
                    onChange={handleChange}
                    placeholder={field.type === 'url' ? 'https://...' : '+1...'}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    id={field.key}
                    required={field.required}
                    className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-xl text-[14px] font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all appearance-none cursor-pointer"
                    value={value}
                    onChange={handleChange}
                  >
                    <option value="">Select option...</option>
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
                    className="w-full min-h-[100px] px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-[14px] font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all custom-scrollbar"
                    value={value || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      onChange(field.key, selected);
                    }}
                  >
                    {field.options?.split(',').map((opt) => (
                      <option key={opt.trim()} value={opt.trim()} className="py-1 px-2 rounded-md hover:bg-zinc-100">
                        {opt.trim()}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'checkbox' && (
                  <label className="relative flex items-center cursor-pointer mt-1">
                    <input
                      id={field.key}
                      type="checkbox"
                      required={field.required}
                      checked={!!value}
                      onChange={handleCheckboxChange}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                    <span className="ml-3 text-sm font-medium text-zinc-600">Active</span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomFieldsRenderer;
