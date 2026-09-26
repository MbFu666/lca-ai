import { updateEntity } from '../api/ipc'
import { invalidateDescriptors } from '../api/entityCache'
import { useTabs, tabKey } from '../stores/tabs'

/** "New session" (OpenCode-style): create a fresh Project and open its tab. */
export async function createProjectSession(): Promise<{ id: string; name: string }> {
  const id = crypto.randomUUID()
  const name = 'New project'
  await updateEntity('Project', { '@type': 'Project', '@id': id, name, variants: [] })
  invalidateDescriptors('Project')
  useTabs.getState().open({ key: tabKey('Project', id), type: 'Project', id, name })
  return { id, name }
}
