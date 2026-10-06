import { useMemo } from 'react'
import { createMemoryAdmin } from '../../data/memoryAdmin'
import { supabaseAdmin } from '../../data/supabaseAdmin'
import { Admin } from './Admin'

/** Админка на настоящих данных: адрес /admin, только для вошедших и только для админов. */
export function AdminPage() {
  return <Admin api={supabaseAdmin} base="/admin" home="/" />
}

/** Админка на выдуманных данных: адрес /dev/admin, только в режиме разработки. */
export function AdminPreview() {
  const api = useMemo(() => createMemoryAdmin(), [])
  return <Admin api={api} base="/dev/admin" home="/dev/app" />
}
