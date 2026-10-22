CREATE TRIGGER order_validate BEFORE INSERT ON orders BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.snapshot,'$.items') i
    LEFT JOIN products p ON p.id=json_extract(i.value,'$.id')
    LEFT JOIN categories c ON c.id=p.category_id
    WHERE p.id IS NULL OR p.published!=1 OR p.archived!=0 OR c.active!=1
      OR p.stock<json_extract(i.value,'$.quantity') OR p.price_cents!=json_extract(i.value,'$.price_cents')
  ) THEN RAISE(ABORT,'quote_changed') END;
  SELECT CASE WHEN (SELECT count(*) FROM orders WHERE request_bucket=NEW.request_bucket
    AND created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour'))>=10
    THEN RAISE(ABORT,'rate_limit') END;
END;
-- statement
CREATE TRIGGER revision_validate BEFORE INSERT ON order_revisions BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM orders WHERE reference=NEW.reference AND version=NEW.expected_version AND state=NEW.old_state)
    THEN RAISE(ABORT,'stale_order') END;
END;
-- statement
CREATE TRIGGER revision_apply AFTER INSERT ON order_revisions BEGIN
  INSERT INTO stock_movements(id,product_id,operation_key,fingerprint,kind,quantity,before_stock,after_stock,origin,actor,reason,order_reference)
    SELECT NEW.id || ':' || p.id,p.id,'order:' || NEW.id || ':' || p.id,NEW.fingerprint,
      CASE WHEN json_extract(i.value,'$.delta')<0 THEN 'exit' ELSE 'entry' END,
      json_extract(i.value,'$.delta'),p.stock,p.stock+json_extract(i.value,'$.delta'),
      'order',NEW.actor,NEW.action,NEW.reference
    FROM json_each(NEW.stock_changes) i JOIN products p ON p.id=json_extract(i.value,'$.id');
  UPDATE orders SET state=NEW.new_state,snapshot=NEW.snapshot,version=version+1,updated_at=NEW.created_at
    WHERE reference=NEW.reference;
END;
