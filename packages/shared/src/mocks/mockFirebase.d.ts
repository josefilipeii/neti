export declare const mockHyroxCategories: {
    id: string;
    name: string;
}[];
export declare const mockFirebase: {
    listCategories(): Promise<{
        id: string;
        name: string;
    }[]>;
    getParticipant(id: string): Promise<{
        id: string;
        name: string;
        email: string;
        category: string;
        partnerName?: string;
        teamName?: string;
        createdAt: Date;
    }>;
    getByEmail(email: string, category?: string): Promise<{
        id: string;
        name: string;
        email: string;
        category: string;
        partnerName?: string;
        teamName?: string;
        createdAt: Date;
    }>;
    checkIn(participantId: string): Promise<{
        id: string;
        participantId: string;
        checkedInAt: Date;
        checkedInBy: string;
    }>;
    getCheckIns(): Promise<{
        id: string;
        participantId: string;
        checkedInAt: Date;
        checkedInBy: string;
    }[]>;
    getParticipants(): Promise<{
        id: string;
        name: string;
        email: string;
        category: string;
        partnerName?: string;
        teamName?: string;
        createdAt: Date;
    }[]>;
};
//# sourceMappingURL=mockFirebase.d.ts.map