/**
 * Default Messages Service - Web implementation
 */

import { ExtensionManager } from '@/lib/extension'
import {
  ConversationalExtension,
  ExtensionTypeEnum,
  ThreadMessage,
} from '@janhq/core'
import { TEMPORARY_CHAT_ID } from '@/constants/chat'
import type { MessagesService } from './types'
import { isSyncApiEnabled, syncApiClient } from '@/lib/sync-api'
import { useAuth } from '@/hooks/useAuth'

export class DefaultMessagesService implements MessagesService {
  async fetchMessages(threadId: string): Promise<ThreadMessage[]> {
    if (isSyncApiEnabled()) {
      const { token, guestSessionId } = useAuth.getState()
      return syncApiClient.listMessages(threadId, token, guestSessionId)
    }

    // Don't fetch messages from server for temporary chat - it's local only
    if (threadId === TEMPORARY_CHAT_ID) {
      return []
    }

    return (
      ExtensionManager.getInstance()
        .get<ConversationalExtension>(ExtensionTypeEnum.Conversational)
        ?.listMessages(threadId)
        ?.catch(() => []) ?? []
    )
  }

  async createMessage(message: ThreadMessage): Promise<ThreadMessage> {
    if (isSyncApiEnabled()) {
      const { token, guestSessionId } = useAuth.getState()
      return syncApiClient.createMessage(
        message.thread_id,
        message,
        token,
        guestSessionId
      )
    }

    // Don't create messages on server for temporary chat - it's local only
    if (message.thread_id === TEMPORARY_CHAT_ID) {
      return message
    }

    return (
      ExtensionManager.getInstance()
        .get<ConversationalExtension>(ExtensionTypeEnum.Conversational)
        ?.createMessage(message)
        ?.catch(() => message) ?? message
    )
  }

  async modifyMessage(message: ThreadMessage): Promise<ThreadMessage> {
    if (isSyncApiEnabled()) {
      const { token, guestSessionId } = useAuth.getState()
      return syncApiClient.updateMessage(
        message.thread_id,
        message,
        token,
        guestSessionId
      )
    }

    // Don't modify messages on server for temporary chat - it's local only
    if (message.thread_id === TEMPORARY_CHAT_ID) {
      return message
    }

    return (
      ExtensionManager.getInstance()
        .get<ConversationalExtension>(ExtensionTypeEnum.Conversational)
        ?.modifyMessage(message)
        ?.catch(() => message) ?? message
    )
  }

  async deleteMessage(threadId: string, messageId: string): Promise<void> {
    if (isSyncApiEnabled()) {
      const { token, guestSessionId } = useAuth.getState()
      await syncApiClient.deleteMessage(threadId, messageId, token, guestSessionId)
      return
    }

    // Don't delete messages on server for temporary chat - it's local only
    if (threadId === TEMPORARY_CHAT_ID) {
      return
    }

    await ExtensionManager.getInstance()
      .get<ConversationalExtension>(ExtensionTypeEnum.Conversational)
      ?.deleteMessage(threadId, messageId)
  }
}
