import { redirect } from 'next/navigation';

export default function PublishersDirectoryPage() {
  redirect('/?publisher=all');
}
