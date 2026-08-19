import Link from "next/link";
import { Briefcase } from "lucide-react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue-500 text-white">
              <Briefcase className="size-5" />
            </span>
            <span className="text-body-1 font-bold tracking-tight text-brand-navy-900">한평생 바로취업</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-title-3 font-bold text-slate-900">{title}</h1>
            {description && <p className="mt-2 text-label-1 text-slate-500">{description}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-label-1 text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-label-1 text-red-600" role="alert">
      {message}
    </div>
  );
}

export function FormNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg bg-brand-blue-50 px-3 py-2.5 text-label-1 text-brand-blue-700" role="status">
      {message}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-label-2 text-red-600">{message}</p>;
}
