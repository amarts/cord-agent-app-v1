import express from "express";
import { getConnection } from "typeorm";

import { Schema as SchemaCord } from "../cord/schema";
import { Schema as SchemaEntity } from "../entity/Schema";

function getSchemaObj(schema: any) {
    let result = {
	options: {},
	schema: {
	    '$schema': 'http://json-schema.org/draft-07/schema#',
	    '$metadata': {},
	    '$id': {},
	    type: 'object',
	    title: schema.title,
	    description: schema.description,
	    properties: schema.properties,
	    required: schema.required
	}
    }

    return result;
}

export class Schema {
  public static async create(req: express.Request, res: express.Response) {
    const data = req.body;
    /* format */
    /*
    { options: {}, schema: { '$schema', '$metadata', '$id', title, description, properties, required }  }
    */

    /* only schema gets through the identifier part. */

    /* validation */
    /* TODO: any thing more? */
    if (!data.schema || !data.schema.title) {
      res.status(400).json({
        error: "'schema' is a required field, with title and description",
      });
      return;
    }

    try {
      const response = await SchemaCord.anchor(data.schema);
      if (response.schema) {
        /* success */
        const schema = new SchemaEntity();
        schema.title = data.schema.title;
        schema.identity = response.schema?.identifier?.replace(
          "schema:cord:",
          ""
        );
        schema.revoked = false;
        schema.content = JSON.stringify(data.schema);
        schema.cordSchema = JSON.stringify(response.schema);
        schema.cordBlock = response.block;

        getConnection().manager.save(schema);
        res.json({ result: "SUCCESS", schema: response.schema.identifier });
      } else {
        res.status(400).json({ error: response.error });
      }
    } catch (err) {
      res.status(500).json({ error: err });
    }
  }

    public static async create1(
	req: express.Request,
	res: express.Response
    ) {
	/* Check the POST input and get the API sorted out */
	const data = req.body;

	/* TODO: check for login */
	const userId = req.header('X-UserId');

	if (userId !== '7his15admin') {
	    return res.status(403).json({error: "Unauthorized"})
	}
	
	/* check for slug duplicate */
	let currentSchema = await getConnection()
            .getRepository(SchemaEntity)
            .createQueryBuilder('s')
            .where('s.slug = :url', { url: data.slug })
            .andWhere('s.latest = :latest', { latest: true })
            .getOne();

	const schema = new SchemaEntity();
	schema.slug = data.slug;
	schema.category = data.category;
	schema.description = data.description;
	schema.icon = data.icon;
	schema.title = data.name;
	schema.versionStr = data.version;
	schema.public = data.discoverable;
	schema.jsonSchema = data.jsonSchema;
	schema.ldContext = data.ldContext;
	schema.ldContextPlus = data.ldContextPlus;
	schema.forkOf = '';

	if (currentSchema !== undefined) {
            if (currentSchema.versionStr === data.version) {
		res.status(400).json({
                    error: 'Slug already present. Try without discoverable field, or provide different slug',
		});
		return;
            }
            schema.slug = currentSchema.slug;
            schema.favoriteCount = currentSchema.favoriteCount;
            schema.numForks = currentSchema.numForks;
            schema.version = currentSchema.version! + 1;
        }

	const schemaObj = getSchemaObj(schema);
	const response = await SchemaCord.anchor(schemaObj);
	if (!response.schema) {
	    return res.status(400).json({error: response.error});
	}
	schema.content = JSON.stringify(schemaObj);
	schema.cordSchema = JSON.stringify(response.schema);
        schema.cordBlock = response.block;
	try {
            await getConnection().transaction(
		async (transactionalEntityManager) => {
		    if (currentSchema) {
			// TODO: provide another API to mark schema as non active
			// Till that time, allow only latest schema to be used in
			// #MARK creation.
			currentSchema.latest = false;
			await transactionalEntityManager.save(currentSchema);
		    }
		    
		    const savedData = await transactionalEntityManager.save(
			schema
		    );
		    if (savedData) {
			res.status(201).json(savedData);
		    } else {
			res.status(500).json({
			    error: 'Failed to create Schema',
			});
		    }
		}
	    );
	} catch (err) {
	    res.status(500).json({ error: 'Failed to create Schema' });
	    return;
	}
    }

    public static async index1(req: express.Request, res: express.Response) {
	try {
	    const schemas = await getConnection()
		  .getRepository(SchemaEntity)
		  .createQueryBuilder("schema")
		  .getMany();
		  if (!schemas || schemas.length === 0) {
		      return res.status(404).json({error: 'empty array'});
		  }
	    const response = schemas
		  .filter((s: SchemaEntity) => {
		      return s.jsonSchema ? true : false;
		  })
		  .map((s: SchemaEntity) => {
		      //s.ipfsHash = [];
		      return {
			  ...s,
			  favourite: 1,
			  discoverable: true,
			  name: s.title,
			  creator: 'Dhiway',
			  deleted: false,
			  version: s.versionStr,
		      };
		  });
	    return res.json(response);
	} catch (err) {
	    return res.status(500).json({ error: err });
	}
    }

    public static async show1(
	req: express.Request,
	res: express.Response,
	version: string,
	type: string
    ) {
	const url = req.params.slug;
	let query = getConnection()
            .getRepository(SchemaEntity)
            .createQueryBuilder('s')
            .where('s.slug = :url', { url: url });
	
	if (version && version !== '') {
            query = query.andWhere('s.versionStr = :version', { version: version });
	}
	
	const schema = await query.orderBy('s.created_at', 'DESC').getOne();
	if (!schema) {
            return res.json({});
	}
	if (!type || type === '') {
            const newS = {
		...schema,
		discoverable: true,
		name: schema.title,
		creator: 'Dhiway',
		deleted: false,
		version: schema.versionStr,
            };

            return res.json(newS);
	}
	if (type === 'json-schema.json') {
            return res.json(JSON.parse(schema.jsonSchema!));
	}
	if (type === 'ld-context.json') {
            await res.set('Content-Type', 'application/ld+json');
            return res.json(JSON.parse(schema.ldContext!));
	}
	if (type === 'ld-context-plus.json') {
            return res.json(JSON.parse(schema.ldContextPlus!));
	}
    }
    
  public static async show(req: express.Request, res: express.Response) {
    try {
      const schema = await getConnection()
        .getRepository(SchemaEntity)
        .createQueryBuilder("schema")
        .where("schema.identity = :id", {
          id: req.params.id?.replace("schema:cord:", ""),
        })
        .getOne();
      res.json(schema);
    } catch (err) {
      res.status(500).json({ error: err });
    }
  }

  public static async index(req: express.Request, res: express.Response) {
    try {
      const schemas = await getConnection()
        .getRepository(SchemaEntity)
        .createQueryBuilder("schema")
        .getMany();

      res.json(schemas);
    } catch (err) {
      res.status(500).json({ error: err });
    }
  }

  public static async revoke(req: express.Request, res: express.Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(404).json({ error: "'id' is a required parameter" });
        return;
      }
      const schema = await getConnection()
        .getRepository(SchemaEntity)
        .createQueryBuilder("schema")
        .where("schema.identity = :id", {
          id: req.params.id?.replace("schema:cord:", ""),
        })

        .getOne();

      if (!schema) {
        res.status(404).json({ error: "no schema found for the id" });
        return;
      }

      let { cordSchema } = schema;
      cordSchema = JSON.parse(cordSchema);

      const response = await SchemaCord.revoke(cordSchema);
      if (response.block) {
        schema.revoked = true;
        getConnection().manager.save(schema);

        res.json({ result: "SUCCESS", record: id, block: response.block });
      } else {
        res.status(500).json({ error: response.error });
      }
    } catch (err) {
      res.status(500).json({ error: err });
    }
  }
}
