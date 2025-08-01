"use client"; // se quiser tudo no cliente (não é o ideal)

import { useParams } from "next/navigation";
import DashboardPage from "../../../components/ambience/DashboardPageWrapper";

export default function Page() {
  const params = useParams();
  const ambienteId = params?.ambienteId as string;

  return <DashboardPage ambienteId={ambienteId} />;
}
