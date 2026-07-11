import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">
          Вход в дашборд
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Статистика Яндекс.Директ
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
