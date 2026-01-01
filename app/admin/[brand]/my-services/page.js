"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import ServiceModal from "@/app/admin/components/ServiceModal";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function MyServices() {
  const params = useParams();
  const router = useRouter();
  const brandContext = useBrandContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [addNewservice, setAddnewservice] = useState(false);
  const [showAddserviceoptions, setshowAddserviceoptions] = useState(false);

  const services = brandContext?.services || [];
  const availedServices = services.map((item) => item.name) || [];

  const availableServices = [
    { serviceName: "lead_journey", serviceTitle: "Talk to me" },
    { serviceName: "pitch_to_me", serviceTitle: "Pitch to me" },
    { serviceName: "job_seeker", serviceTitle: "Work with me" },
    { serviceName: "buy_my_product", serviceTitle: "Buy my product" },
  ];
  const allServicesAvailed = availedServices.length >= availableServices.length;
  const handleEdit = (service) => {
    setSelectedService(service);
    setAddnewservice(false);
    setIsModalOpen(true);
  };

  const addService = (service) => {
    setSelectedService({
      name: service.serviceName,
      title: service.serviceTitle,
    });
    setAddnewservice(true);
    setshowAddserviceoptions(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setAddnewservice(false);
  };

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setshowAddserviceoptions(false);
      }
    };

    if (showAddserviceoptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddserviceoptions]);

  return (
    <>
      <div className="bg-white h-[calc(100vh-56px)] overflow-hidden flex items-center justify-center relative">
        <div className="absolute top-4 left-6">
          <button
            onClick={() => router.back()}
            className="text-black hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 font-akshar">
          <div className="text-center mb-8">
            <h1 className="uppercase font-zen text-3xl md:text-4xl font-black text-[#000A67] leading-tight tracking-tight">
              My services
            </h1>
          </div>
          {/* Service options */}
          <div className="flex flex-col items-center gap-4 font-akshar">
            {services.map((service, index) => (
              <div key={index}>
                <button
                  className="text-gray-600 uppercase text-base tracking-wider font-normal relative pb-1 w-fit hover:opacity-60 transition-opacity"
                  onClick={() => handleEdit(service)}
                >
                  {service?.title || service?.name || "Untitled Service"}
                </button>
                <div className="h-[0.5px] w-[40px] mx-auto bg-slate-400 my-4"></div>
              </div>
            ))}
            {!allServicesAvailed && (
              <div className="relative" ref={dropdownRef}>
                <div>
                  <button
                    onClick={() => setshowAddserviceoptions((prev) => !prev)}
                    className="text-gray-600 uppercase text-base tracking-wider font-normal relative pb-1 w-fit hover:opacity-60 transition-opacity"
                  >
                    ADD SERVICES
                  </button>
                  <div className="h-[0.5px] w-[40px] mx-auto bg-slate-400 my-4"></div>
                </div>
                {showAddserviceoptions && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    {availableServices
                      .filter(
                        (item) => !availedServices.includes(item.serviceName)
                      )
                      .map((item, index) => (
                        <button
                          key={index}
                          onClick={() => addService(item)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg text-sm"
                        >
                          {item.serviceTitle}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ServiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        service={selectedService}
        addNewservice={addNewservice}
      />
    </>
  );
}
