# Design Document: Customer Help/FAQ Page

## Overview

This feature implements a read-only Help page for Bloom customers that displays FAQs in an accordion layout. The architecture follows a simple pattern: a static JSON configuration file on the backend serves FAQ content through a public endpoint, which the frontend fetches and renders using an accordion component with markdown support.

The design prioritizes simplicity over flexibility - no database, no admin editor, no forms. FAQ updates happen through code deployment.

## Architecture

```mermaid
flowchart LR
    subgraph Backend
        JSON[faq.json] --> Router[/public/faq]
    end
    
    subgraph Frontend
        API[API Client] --> Page[HelpPage]
        Page --> Accordion[FAQAccordion]
        Accordion --> MD[Markdown Renderer]
    end
    
    Router --> API
```

### Data Flow

1. `faq.json` is loaded at application startup or on-demand
2. `GET /public/faq` returns the JSON content (no auth required)
3. Frontend `getFAQ()` fetches the data
4. `HelpPage` renders the accordion with FAQ items
5. Markdown in answers is rendered with link support

## Components and Interfaces

### Backend Components

#### Static Configuration File
- Location: `apps/api/config/faq.json`
- Loaded synchronously when endpoint is called
- No caching required for MLP (file is small)

#### Public FAQ Router
- File: `apps/api/routes/public.py`
- Prefix: `/public`
- Single endpoint: `GET /faq`

```python
# Pseudocode
@router.get("/faq")
async def get_faq():
    """Return FAQ content from static JSON file."""
    config_path = Path(__file__).parent.parent / "config" / "faq.json"
    with open(config_path) as f:
        return json.load(f)
```

### Frontend Components

#### HelpPage Component
- File: `apps/web/src/pages/customer/HelpPage.tsx`
- Route: `/customer/help`
- Role: CUSTOMER only

```typescript
// Pseudocode structure
function HelpPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  useEffect(() => {
    getFAQ().then(data => setFaqs(data.items));
  }, []);
  
  return (
    <div>
      <h1>Help</h1>
      <p>Frequently asked questions</p>
      <FAQAccordion 
        items={faqs} 
        expandedId={expandedId}
        onToggle={setExpandedId}
      />
    </div>
  );
}
```

#### FAQAccordion Component
- File: `apps/web/src/components/FAQAccordion.tsx`
- Single-item expansion behavior
- Smooth CSS transitions

```typescript
// Pseudocode structure
interface FAQAccordionProps {
  items: FAQItem[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}

function FAQAccordion({ items, expandedId, onToggle }: FAQAccordionProps) {
  return (
    <div>
      {items.map(item => (
        <AccordionItem
          key={item.id}
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={() => onToggle(expandedId === item.id ? null : item.id)}
        />
      ))}
    </div>
  );
}
```

#### Markdown Rendering
- Use a lightweight markdown library (e.g., `marked` or `react-markdown`)
- Support: bold (`**text**`), links (`[text](url)`), mailto links
- Sanitize output to prevent XSS

## Data Models

### FAQ JSON Schema

```json
{
  "version": 1,
  "items": [
    {
      "id": "unique-id",
      "question": "Question text here?",
      "answer_markdown": "Answer with **bold** and [links](url)."
    }
  ]
}
```

### TypeScript Interfaces

```typescript
// packages/shared/src/types/faq.ts

interface FAQItem {
  id: string;
  question: string;
  answer_markdown: string;
}

interface FAQResponse {
  version: number;
  items: FAQItem[];
}
```

### Initial FAQ Content

The `faq.json` file will include these starter FAQs:

1. **How do I change my subscription plan?** - Navigate to Subscription page
2. **How do I skip a delivery?** - Contact support (future feature)
3. **What if I'm not home for delivery?** - Deliveries left at door
4. **How do I contact support?** - Email link with mailto
5. **Can I change my delivery address?** - Contact property manager

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: FAQ JSON Round-Trip

*For any* valid FAQResponse object, serializing it to JSON and parsing it back SHALL produce an equivalent object with the same version, item count, and item contents.

**Validates: Requirements 1.1, 1.2, 1.3, 2.2**

### Property 2: Single-Item Expansion Invariant

*For any* sequence of accordion toggle operations, at most one FAQ item SHALL be in the expanded state at any given time.

**Validates: Requirements 4.3**

### Property 3: Non-Customer Role Redirect

*For any* user with a role other than CUSTOMER, navigating to `/customer/help` SHALL result in a redirect to their role-specific landing page.

**Validates: Requirements 3.3**

### Property 4: Markdown Link Rendering

*For any* FAQ item containing markdown links (including mailto links), the rendered HTML output SHALL contain properly formatted anchor tags with correct href attributes.

**Validates: Requirements 4.5, 5.1**

## Error Handling

### Backend Errors

| Scenario | Response |
|----------|----------|
| `faq.json` missing | 500 Internal Server Error with error message |
| `faq.json` invalid JSON | 500 Internal Server Error with parse error |
| File read permission error | 500 Internal Server Error |

### Frontend Errors

| Scenario | Handling |
|----------|----------|
| API request fails | Show error message with retry option |
| Empty FAQ list | Show "No FAQs available" message |
| Markdown parse error | Display raw text as fallback |

## Testing Strategy

### Unit Tests

**Backend:**
- Endpoint returns 200 with valid JSON structure
- Endpoint accessible without authentication
- Response matches FAQResponse schema

**Frontend:**
- HelpPage renders title and subtitle
- FAQAccordion renders all items
- Click expands/collapses items
- Markdown renders links correctly
- Mailto links have correct href format

### Property-Based Tests

**Property 1: FAQ JSON Round-Trip**
- Library: Hypothesis (Python)
- Generate random FAQResponse objects
- Serialize to JSON, parse back, compare
- Minimum 100 iterations

**Property 2: Single-Item Expansion**
- Library: fast-check (TypeScript)
- Generate random click sequences
- Verify invariant after each click
- Minimum 100 iterations

**Property 3: Non-Customer Redirect**
- Library: Vitest with role mocking
- Test each non-customer role
- Verify redirect destination

**Property 4: Markdown Link Rendering**
- Library: fast-check (TypeScript)
- Generate FAQ items with various markdown patterns
- Verify rendered HTML contains correct anchor tags
- Minimum 100 iterations
