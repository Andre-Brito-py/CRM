import { CheckIcon } from '@heroicons/react/24/outline';

const Pricing = ({ products }) => {
  return (
    <div className="w-full py-10">
      <div className="relative flex flex-col px-5 mx-auto space-y-5 md:w-3/4">
        <div className="flex flex-col items-center">
          <h6 className="font-bold text-center text-blue-600 uppercase">
            Pricing
          </h6>
          <h2 className="text-4xl font-bold text-center">
            <span className="block">
              The right pricing for you, whoever you are
            </span>
          </h2>
          <p className="text-center text-gray-600">
            It features multiple CSS components based on the Tailwind CSS design
            system
          </p>
        </div>
        <div className="flex flex-col p-10 space-x-0 space-y-5 bg-gray-200 rounded-lg md:space-y-0 md:space-x-5 md:flex-row">
          {products?.length > 0 ? (
            products.map((product, index) => (
              <div key={index} className="flex flex-col items-start overflow-hidden bg-white border rounded-lg md:w-1/2">
                <div className="w-full p-10 space-y-5">
                  <span className="px-5 py-1 text-sm text-blue-600 uppercase bg-blue-100 rounded-full">
                    {product.name}
                  </span>
                  <h2 className="space-x-2 text-6xl">
                    <span className="font-extrabold">${product.price}</span>
                    <small className="text-lg text-gray-400">per {product.interval}</small>
                  </h2>
                  <p className="text-gray-500">{product.description}</p>
                </div>
                <div className="flex flex-col w-full h-full p-10 space-y-5 bg-gray-100 border-t">
                  <a
                    className="px-10 py-3 text-lg text-center text-blue-600 bg-white rounded shadow hover:bg-blue-50"
                    href="/auth/register"
                  >
                    Get Started with {product.name}
                  </a>
                  <div className="space-y-5">
                    <h6 className="uppercase">What&apos;s Included</h6>
                    <ul className="leading-10 list-none list-inside items-center">
                      <li className="flex items-center space-x-5">
                        <CheckIcon className="w-5 h-5 text-green-600" />
                        <span>Full CRM Access</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full text-center">
              <p>No pricing plans available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
