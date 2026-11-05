import { ArtistView } from '@/components/views/ArtistView';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArtistView id={id} />;
}
