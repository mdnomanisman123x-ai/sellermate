"use client";
import { useRouter } from "next/navigation";
import CustomerForm from "./CustomerForm";
import Sheet from "./Sheet";
import { useStore } from "@/lib/store";

export default function AddCustomerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCustomer } = useStore();
  const router = useRouter();
  return (
    <Sheet open={open} onClose={onClose} title="নতুন গ্রাহক">
      <CustomerForm
        submitLabel="গ্রাহক সেভ করুন"
        onSubmit={(v) => {
          const id = addCustomer(v);
          onClose();
          router.push(`/customers/${id}`);
        }}
      />
    </Sheet>
  );
}
