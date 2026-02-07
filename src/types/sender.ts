/**
 * Sender information from email addresses
 */
export interface SenderInfo {
  name: string
  address: string
}

/**
 * Raw sender address format (can be various shapes)
 */
export interface RawSenderAddress {
  name?: string
  address?: string
}
