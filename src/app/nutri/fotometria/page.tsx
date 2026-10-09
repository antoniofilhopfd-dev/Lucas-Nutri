import { ANGLES, ANGLE_LABEL } from "@/features/photometry/rules";
import { PhotoGuide } from "@/components/PhotoGuide";
export default function Fotometria() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Fotometria</h1>
      <p className="text-graphite/70">Fotos clínicas ficam em bucket privado e só abrem por URL assinada com validade curta. Exige consentimento de uso clínico de imagem.</p>
      <div className="grid grid-cols-2 gap-3">
        {ANGLES.map((a) => <div key={a} className="relative aspect-[3/4] rounded-xl border border-mist bg-white text-olive"><PhotoGuide /><span className="absolute bottom-2 left-2 text-sm text-graphite">{ANGLE_LABEL[a]}</span></div>)}
      </div>
    </section>
  );
}
