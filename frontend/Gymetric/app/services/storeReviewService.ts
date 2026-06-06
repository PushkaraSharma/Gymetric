import * as StoreReview from 'expo-store-review'
import { storage } from '@/utils/LocalStorage'

const ACTION_COUNTER_KEY = '@store_review_action_count'
const LAST_PROMPT_KEY = '@store_review_last_prompt_date'
const HAS_REVIEWED_KEY = '@store_review_has_reviewed'

export const incrementActionAndReview = async () => {
  try {
    const lastPrompt = storage.getString(LAST_PROMPT_KEY)
    const hasReviewed = storage.getBoolean(HAS_REVIEWED_KEY)

    if (hasReviewed) return

    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000
    if (lastPrompt) {
      const lastDate = new Date(lastPrompt).getTime()
      if (Date.now() - lastDate < ONE_MONTH_MS) return
    }

    const currentCount = storage.getNumber(ACTION_COUNTER_KEY) || 0
    const newCount = currentCount + 1
    storage.set(ACTION_COUNTER_KEY, newCount)

    if (newCount >= 3) {
      const isAvailable = await StoreReview.isAvailableAsync()
      if (isAvailable) {
        await StoreReview.requestReview()
        storage.set(LAST_PROMPT_KEY, new Date().toISOString())
      }
    }
  } catch (error) {
    console.error('[StoreReview] Failed to handle review logic:', error)
  }
}

export const forceRequestReview = async () => {
  if (await StoreReview.isAvailableAsync()) {
    await StoreReview.requestReview()
  }
}
