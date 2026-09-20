import { redirect } from 'next/navigation';
import { getPublisherBySlug } from '@/lib/catalog-service';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublisherDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const pub = getPublisherBySlug(slug);
  if (pub) {
    redirect(`/?publisher=${pub.id}`);
  }
  redirect('/?publisher=all');
}
