import { useQuery } from '@tanstack/react-query'
import { listIdeas } from '@/lib/api/ideas'

export const ideasQueryKey = ['ideas'] as const

export function useIdeasQuery() {
  return useQuery({
    queryKey: ideasQueryKey,
    queryFn: async () => {
      const { ideas } = await listIdeas()
      return ideas
    },
  })
}
