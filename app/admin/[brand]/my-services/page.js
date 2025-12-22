"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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

  const services = brandContext?.services || [];

  const handleEdit = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const addService = () => {
    setSelectedService(null);
    setIsModalOpen(true);
    setAddnewservice(true);
  };

  return (
    <>
      <div className="bg-white h-screen overflow-y-scroll flex flex-col scrollbar-hidden">
        <div className=" px-6 flex-1 flex flex-col">
          <div className="mt-16">
            <button
              onClick={() => router.back()}
              className=" text-black hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h1 className="ml-4 text-3xl md:text-4xl font-black text-purple-900 mb-8 leading-tight tracking-tight normal-case">
              My services
            </h1>
          </div>
          {/* Service options */}
          <div className="flex flex-col items-center gap-6 flex-1 justify-center">
            {services.map((service, index) => (
              <button
                key={index}
                className="text-black uppercase text-base tracking-wider font-normal relative pb-1 border-b border-black hover:opacity-60 transition-opacity"
                onClick={() => handleEdit(service)}
              >
                {service?.title || service?.name || "Untitled Service"}
              </button>
            ))}
            <button
              onClick={() => addService()}
              className="text-black uppercase text-base tracking-wider font-normal relative pb-1 border-b border-black hover:opacity-60 transition-opacity"
            >
              ADD SERVICES
            </button>
          </div>
        </div>
      </div>

      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={selectedService}
        addNewservice={addNewservice}
      />
    </>
  );
}
