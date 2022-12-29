import {
    Entity,
    PrimaryColumn,
    Column,
    BeforeInsert,
    CreateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';


@Entity()
export class Schema {
    @BeforeInsert()
    generateId() {
        if (!this.id) {
            this.id = uuidv4();
        }
    }
    @PrimaryColumn()
    id?: string;

    @Column()
    title?: string;

    @Column({length: 64})
    identity?: string;

    @Column({nullable: true, default: null})
    revoked?: boolean;

    @Column({ default: 'General' })
    category?: string;

    @Column({ default: '-' })
    description?: string;

    @Column({ default: null, nullable: true })
    properties?: string;

    @Column({ default: '' })
    uniqueField?: string;

    @Column({
        type: 'text',
        array: true,
        default: null,
        nullable: true,
    })
    requires?: string[];

    @Column({ default: null, nullable: true })
    versionStr?: string;

    @Column({ default: 1 })
    version?: number;

    @Column({ default: null, nullable: true })
    jsonSchema?: string;
    @Column({ default: null, nullable: true })
    ldContext?: string;
    @Column({ default: null, nullable: true })
    ldContextPlus?: string;

    @Column({ default: true })
    latest?: boolean;

    @Column({ default: false })
    public?: boolean;

    @Column({ default: null, nullable: true })
    icon?: string;

    @Column({ default: null, nullable: true })
    forkOf?: string;

    @Column({ default: 0 })
    favoriteCount?: number;

    @Column({ default: 0 })
    numForks?: number;

    @Column({ default: null, nullable: true })
    slug?: string; // this is common upon updates
    
    @Column({type: 'text'})
    content?: string;

    @Column({type: 'text'})
    cordSchema?: string;

    @Column()
    cordBlock?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt?: Date;
}
