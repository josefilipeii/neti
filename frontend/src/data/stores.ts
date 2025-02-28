import {Category, Competition} from "../../../shared/domain";


export interface CompetitionStore {
    competitions: () => Promise<Competition[]>;
}

export interface CategoryStore {
    categories: (competition: string) => Promise<Category[]>;
}

export interface Repository extends CompetitionStore, CategoryStore {
}