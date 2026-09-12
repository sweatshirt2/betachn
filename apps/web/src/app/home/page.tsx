'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, Field, Skeleton } from '@/components/ui';
import { useAssets, useCreateAsset, useCreateRoom, useRooms } from '@/features/home';

export default function HomePage() {
  const { t } = useTranslation();
  const rooms = useRooms();
  const assets = useAssets();
  const createRoom = useCreateRoom();
  const createAsset = useCreateAsset();
  const [roomName, setRoomName] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetRoom, setAssetRoom] = useState('');

  if (rooms.isPending || assets.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (rooms.isError || assets.isError) {
    return <EmptyState emoji="😕" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => { rooms.refetch(); assets.refetch(); }}>{t('common.retry')}</Button>} />;
  }

  async function onCreateRoom(event: React.FormEvent) {
    event.preventDefault();
    if (roomName.trim().length === 0) return;
    await createRoom.mutateAsync({ name: roomName.trim() });
    setRoomName('');
  }

  async function onCreateAsset(event: React.FormEvent) {
    event.preventDefault();
    if (assetName.trim().length === 0) return;
    await createAsset.mutateAsync({ name: assetName.trim(), roomId: assetRoom === '' ? null : assetRoom });
    setAssetName('');
  }

  return (
    <div>
      <h1 className="font-display text-2xl">{t('ops.home')}</h1>
      <section aria-label={t('ops.rooms')} className="mt-3">
        <h2 className="font-display text-lg">{t('ops.rooms')}</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {rooms.data.rooms.map((r) => (
            <Card key={r.id} className="py-3 text-center">
              <p className="text-2xl" aria-hidden>
                {r.icon}
              </p>
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="text-muted text-xs">
                {t('ops.assetsCount', { count: assets.data.assets.filter((a) => a.roomId === r.id).length })}
              </p>
            </Card>
          ))}
        </div>
        <Card className="mt-2">
          <form onSubmit={onCreateRoom} className="flex gap-2">
            <Field label={t('ops.newRoom')} value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder={t('ops.roomPlaceholder')} />
            <Button type="submit" disabled={createRoom.isPending || roomName.trim().length === 0}>
              {t('common.add')}
            </Button>
          </form>
        </Card>
      </section>
      <section aria-label={t('ops.assets')} className="mt-5">
        <h2 className="font-display text-lg">{t('ops.assets')}</h2>
        <div className="mt-2 flex flex-col gap-2">
          {assets.data.assets.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 py-2">
              <span className="text-xl" aria-hidden>
                {a.icon}
              </span>
              <p className="flex-1 text-sm font-semibold">{a.name}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-2">
          <form onSubmit={onCreateAsset} className="flex flex-col gap-2">
            <Field label={t('ops.newAsset')} value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder={t('ops.assetPlaceholder')} />
            <label className="block">
              <span className="text-sm font-semibold">{t('ops.roomOptional')}</span>
              <select
                className="bg-surface-alt text-ink border-line shadow-soft focus:border-terracotta focus:ring-terracotta/30 mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2"
                value={assetRoom}
                onChange={(e) => setAssetRoom(e.target.value)}
              >
                <option value="">{t('ops.noRoom')}</option>
                {rooms.data.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={createAsset.isPending || assetName.trim().length === 0}>
              {t('ops.addAsset')}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
