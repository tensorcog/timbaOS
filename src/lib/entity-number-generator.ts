import prisma from './prisma';

/**
 * Entity number generator - centralizes all sequence-based ID generation
 * Ensures consistent format across the application
 */

export type EntityType = 'QUOTE' | 'ORDER' | 'TRANSFER';

interface EntityNumberConfig {
    prefix: string;
    startFrom: number;
}

const ENTITY_CONFIGS: Record<EntityType, EntityNumberConfig> = {
    QUOTE: { prefix: 'Q', startFrom: 1000 },
    ORDER: { prefix: 'ORD', startFrom: 1000 },
    TRANSFER: { prefix: 'TXF', startFrom: 1000 },
};

/**
 * Generate a unique entity number using database sequences
 * @param type - Type of entity (QUOTE, ORDER, TRANSFER)
 * @param tx - Optional Prisma transaction client
 * @returns Formatted entity number (e.g., "Q-1001", "ORD-1001")
 */
export async function generateEntityNumber(
    type: EntityType,
    tx?: any
): Promise<string> {
    const config = ENTITY_CONFIGS[type];
    const client = tx || prisma;

    let sequence;

    switch (type) {
        case 'QUOTE':
            sequence = await client.quoteSequence.create({ data: {} });
            break;
        case 'ORDER':
            sequence = await client.orderSequence.create({ data: {} });
            break;
        case 'TRANSFER':
            // TransferSequence doesn't exist yet, fall back to timestamp for now
            // TODO: Create TransferSequence model when implementing transfers
            return `${config.prefix}-${Date.now()}`;
        default:
            throw new Error(`Unknown entity type: ${type}`);
    }

    return `${config.prefix}-${config.startFrom + sequence.id}`;
}

/**
 * Validate entity number format
 */
export function isValidEntityNumber(number: string, type: EntityType): boolean {
    const config = ENTITY_CONFIGS[type];
    const regex = new RegExp(`^${config.prefix}-\\d+$`);
    return regex.test(number);
}
