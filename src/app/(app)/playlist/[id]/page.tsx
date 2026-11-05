import { PlaylistView } from '@/components/views/PlaylistView';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaylistView id={id} />;
}
