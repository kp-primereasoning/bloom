/**
 * FAQ types for the Customer Help page.
 * 
 * These types define the structure for FAQ content served from
 * the static JSON configuration file.
 */

/**
 * A single FAQ item with question and markdown-formatted answer.
 */
export interface FAQItem {
  /** Unique identifier for the FAQ item */
  id: string;
  /** The question text */
  question: string;
  /** The answer in markdown format (supports bold, links, mailto) */
  answer_markdown: string;
}

/**
 * Response from GET /public/faq endpoint.
 * Contains version number and array of FAQ items.
 */
export interface FAQResponse {
  /** Schema version for future compatibility */
  version: number;
  /** Array of FAQ items */
  items: FAQItem[];
}
