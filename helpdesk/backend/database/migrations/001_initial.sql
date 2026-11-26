CREATE TABLE usuarios (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(100) NOT NULL CHECK (length(btrim(nome)) > 0),
  email VARCHAR(150) NOT NULL UNIQUE
    CHECK (email = lower(btrim(email)) AND length(email) > 0),
  senha_hash TEXT NOT NULL CHECK (length(btrim(senha_hash)) > 0),
  perfil VARCHAR(20) NOT NULL DEFAULT 'solicitante'
    CHECK (perfil IN ('solicitante', 'atendente')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chamados (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  solicitante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  titulo VARCHAR(150) NOT NULL CHECK (length(btrim(titulo)) > 0),
  descricao VARCHAR(5000) NOT NULL CHECK (length(btrim(descricao)) > 0),
  categoria VARCHAR(20) NOT NULL
    CHECK (categoria IN ('computador', 'internet', 'sistema', 'impressora', 'outros')),
  prioridade VARCHAR(10) NOT NULL DEFAULT 'media'
    CHECK (prioridade IN ('baixa', 'media', 'alta')),
  local_problema VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'em_atendimento', 'resolvido')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvido_em TIMESTAMPTZ,
  CHECK ((status = 'resolvido') = (resolvido_em IS NOT NULL))
);

CREATE INDEX chamados_solicitante_data_idx ON chamados(solicitante_id, criado_em DESC);
CREATE INDEX chamados_status_data_idx ON chamados(status, criado_em DESC);

CREATE FUNCTION atualizar_datas_chamado() RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := CURRENT_TIMESTAMP;
  IF NEW.status = 'resolvido' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.resolvido_em := CURRENT_TIMESTAMP;
    ELSIF OLD.status <> 'resolvido' THEN
      NEW.resolvido_em := CURRENT_TIMESTAMP;
    ELSE
      NEW.resolvido_em := OLD.resolvido_em;
    END IF;
  ELSE
    NEW.resolvido_em := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chamados_datas BEFORE INSERT OR UPDATE ON chamados
FOR EACH ROW EXECUTE FUNCTION atualizar_datas_chamado();

-- Formato compatível com armazenamento de sessão express-session/PostgreSQL.
-- O middleware e a expiração serão integrados na etapa de autenticação.
CREATE TABLE sessoes (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX sessoes_expire_idx ON sessoes(expire);
