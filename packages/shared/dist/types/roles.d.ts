/**
 * User roles in the Bloom platform
 */
export declare const UserRole: {
    readonly CUSTOMER: "CUSTOMER";
    readonly PROPERTY_MANAGER: "PROPERTY_MANAGER";
    readonly FLORIST: "FLORIST";
    readonly ADMIN: "ADMIN";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
/**
 * Array of all user roles for iteration
 */
export declare const ALL_ROLES: ("CUSTOMER" | "PROPERTY_MANAGER" | "FLORIST" | "ADMIN")[];
//# sourceMappingURL=roles.d.ts.map