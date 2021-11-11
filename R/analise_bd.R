library(tidyverse)
library(lubridate)
library(RColorBrewer)
library(viridis)
library(colorspace)
library(readxl)

data_leilao_raw      <- read_excel('./dados-entrada/_LEILOES/LEILAO.xlsx')
data_titulo_raw      <- read_excel('./dados-entrada/_LEILOES/LEILAO_VENCIMENTO_TITULO.xlsx')
data_tipo_titulo_raw <- read_excel('./dados-entrada/_LEILOES/TITULO.xlsx')

data_raw <- data_titulo_raw %>%
  left_join(data_leilao_raw) %>%
  left_join(data_tipo_titulo_raw)

data_pre <- data_raw %>%
  mutate_at(vars(starts_with('DT_')), ~lubridate::dmy(.)) %>%
  mutate(duracao = interval(DT_LEILAO, DT_VENCIMENTO_TITULO)/years(1),
         faixa_duracao = cut(duracao, 
                             #breaks = c(0, 1, 2, 5, 10, 20, 30, 50),
                             #labels = c('até 1 ano', '1 a 2', '2 a 5', '5 a 10', '10 a 20', '20 a 30', '30 e acima'))) %>%
                             breaks = c(0, 1, 2, 5, 10, Inf),
                             labels = c('até 1 ano', '1 a 2 anos', '2 a 5 anos', '5 a 10 anos', 'Acima de 10 anos'))) %>%
  filter(
    SG_TITULO != 'BTN-BIB',
    QT_ACEITA != 0) %>%
  mutate(ano_leilao = year(DT_LEILAO),
         mes_ano = paste0(year(DT_LEILAO), str_pad(month(DT_LEILAO), width = 2, pad = '0'))) %>%
  arrange(SG_TITULO, ano_leilao, duracao) %>%
  group_by(SG_TITULO, ano_leilao) %>%
  mutate(acum = cumsum(VA_FINANCEIRO_ACEITO)) %>%
  ungroup()

# data leilão x data vencimento
ggplot(data_pre, aes(
  y = DT_VENCIMENTO_TITULO, 
  x = DT_LEILAO, 
  size = VA_FINANCEIRO_ACEITO,
  color = ID_TITULO)) + 
  geom_point()

# data leilão x juros aceite
graf_dataXjuros <- ggplot(data_pre, aes(
  y = VA_TAXA_ACEITA, 
  x = DT_LEILAO, 
  size = VA_FINANCEIRO_ACEITO,
  #color = Bond.Type
  fill = faixa_duracao
  )) + 
  geom_point(alpha = .5, shape = 21, stroke = 0) +
  #scale_color_brewer(palette = 'YlOrRd')
  labs(y = "Taxa Aceita", x = "Data do Leilão", fill = "Duração") +
  #scale_fill_viridis_d(option = "A", direction = -1) +
  scale_fill_discrete_sequential("SunsetDark") +
  guides(fill = guide_legend(override.aes = list(size=5)),
         size = FALSE) +
  theme_bw()

graf_dataXjuros + facet_wrap(~SG_TITULO, scales = "free")

# LTN data leilão x juros aceite -- até dois anos
ggplot(data_pre %>% filter(duracao <= 2, SG_TITULO == 'LTN'), aes(
  y = VA_TAXA_ACEITA, 
  x = DT_LEILAO, 
  size = VA_FINANCEIRO_ACEITO
)) + 
  geom_point(alpha = .5, shape = 21, stroke = 0, fill = "tomato") +
  #scale_color_brewer(palette = 'YlOrRd')
  labs(y = "Taxa Aceita", x = "Data do Leilão", fill = "Duração") +
  #scale_fill_viridis_d(option = "A", direction = -1) +
  scale_fill_discrete_sequential("SunsetDark") +
  guides(fill = guide_legend(override.aes = list(size=5)),
         size = FALSE) +
  theme_bw() #+ facet_wrap(~faixa_duracao)

# por duração
ggplot(data_pre, aes(
  y = VA_TAXA_ACEITA, 
  x = duracao, 
  size = VA_FINANCEIRO_ACEITO,
  #color = Bond.Type
  fill = ano_leilao
)) + 
  geom_point(alpha = .5, shape = 21, stroke = 0) +
  #scale_color_brewer(palette = 'YlOrRd')
  labs(y = "Taxa Aceita", x = "Duração", fill = "Ano do leilão") +
  #scale_fill_viridis_d(option = "A", direction = -1) +
  scale_fill_continuous_sequential("SunsetDark") +
  guides(fill = guide_legend(override.aes = list(size=5)),
         size = FALSE) +
  theme_bw() + facet_wrap(~SG_TITULO, scales = "free")

# sumarios ----------------------------------------------------------------

# 'BTN-BIB' ?
data_pre %>% filter(SG_TITULO == 'BTN-BIB') %>% count(lubridate::year(DT_LEILAO))

data_pre %>% filter(VA_TAXA_ACEITA <= 0) %>% nrow()
data_pre %>% filter(VA_FINANCEIRO_ACEITO <= 0) %>% nrow()
data_pre %>% filter(is.na(VA_VNA)) %>% nrow()
  
ggplot(data_pre, aes(y = Bond.Type, x = Total.Amount.Accepted..R..)) + geom_col()

#quantidade por data de vencimento
ggplot(data_pre %>% filter(SG_TITULO == "NTN-B")) +
  geom_histogram(aes(
    x = DT_VENCIMENTO_TITULO
  ))

#valores totais por ano, por título
ggplot(data_pre, 
       aes(
         x = ano_leilao, 
         y = VA_FINANCEIRO_ACEITO, 
         fill = faixa_duracao, #fill = SG_TITULO
         )) + 
  geom_col() +
  labs(x = "Ano do Leilão", y = "Valor total", fill = "Tipo de título") + 
  scale_y_continuous(labels = function(x) {paste(format(round(x/1e9)), "bi")}) +
  scale_fill_discrete_sequential("SunsetDark") +
  #scale_fill_brewer(palette = "Set2") +
  facet_wrap(~SG_TITULO) + theme_bw()


#valores totais por ano, por título, stacked
ggplot(data_pre, 
       aes(
         x = ano_leilao, 
         y = VA_FINANCEIRO_ACEITO, 
         fill = SG_TITULO
       )) + 
  geom_col() +
  labs(x = "Ano do Leilão", y = "Valor total", fill = "Tipo de título") + 
  scale_y_continuous(labels = function(x) {paste(format(round(x/1e9)), "bi")}) +
  scale_fill_brewer(palette = "Set2")

#valores totais por ano, por título, stacked, percentual
ggplot(data_pre, 
       aes(
         x = ano_leilao, 
         y = VA_FINANCEIRO_ACEITO, 
         fill = SG_TITULO
       )) + 
  geom_col(position = "fill") +
  labs(x = "Ano do Leilão", y = "Valor total", fill = "Tipo de título") + 
  scale_y_continuous(labels = function(x) {paste(format(round(x/1e9)), "bi")}) +
  scale_fill_brewer(palette = "Set2")

# valores totais por ano, por vencimento, stacked, por título

ggplot(data_pre, 
       aes(
         x = ano_leilao, 
         y = VA_FINANCEIRO_ACEITO, 
         fill = faixa_duracao
       )) + 
  geom_col() +
  labs(x = "Ano do Leilão", y = "Valor total", fill = "Tipo de título") + 
  scale_y_continuous(labels = function(x) {paste(format(round(x/1e9)), "bi")}) +
  scale_fill_discrete_sequential("SunsetDark") +
  facet_wrap(~SG_TITULO) +
  theme_bw()

# Totais por ano do vencimento (de 2021 em diante), por faixa de duração -- para cada título

ggplot(data_pre %>% filter(year(DT_VENCIMENTO_TITULO) >= 2021), 
       aes(
         x = year(DT_VENCIMENTO_TITULO), 
         y = VA_FINANCEIRO_ACEITO, 
         fill = faixa_duracao
       )) + 
  geom_col() +
  labs(x = "Ano do Leilão", y = "Valor total", fill = "Faixa de duração") + 
  scale_y_continuous(labels = function(x) {paste(format(round(x/1e9)), "bi")}) +
  scale_fill_discrete_sequential("SunsetDark") +
  facet_wrap(~SG_TITULO) +
  theme_bw()

# Totais por ano do vencimento (de 2021 em diante), por título

ggplot(data_pre %>% filter(year(DT_VENCIMENTO_TITULO) >= 2021), 
       aes(
         x = year(DT_VENCIMENTO_TITULO), 
         y = VA_FINANCEIRO_ACEITO, 
         fill = SG_TITULO
       )) + 
  geom_col() +
  labs(x = "Ano do Leilão", y = "Valor total", fill = "Título") + 
  scale_y_continuous(labels = function(x) {paste(format(round(x/1e9)), "bi")}) +
  scale_fill_brewer(palette = 'Set2') +
  theme_bw()

# stats -------------------------------------------------------------------

data_pre$duracao %>% summary()

ggplot(data_pre) + geom_histogram(aes(x = duracao), bins = 100) +
  facet_wrap(~Bond.Type)

data_pre %>% filter(ano_leilao == 2020) %>% select(VA_FINANCEIRO_ACEITO) %>% unlist() %>% sum()

ggplot(data_pre %>% filter(SG_TITULO == "LTN")) + 
  geom_histogram(aes(x = duracao), bins = 100) #+ 
  #facet_wrap(~SG_TITULO)

ggplot(data_pre) + 
  geom_histogram(aes(
    x = duracao,
    fill = SG_TITULO), bins = 100) + 
  facet_wrap(~SG_TITULO)

# Ideias ------------------------------------------------------------------

#Usar year(Maturity.Date) num gif?

## variacao em cada ano

ggplot(data_pre, aes(
  y = VA_TAXA_ACEITA, 
  x = ano_leilao, 
  #color = Bond.Type
  fill = faixa_duracao
)) + 
  geom_point(alpha = .5, shape = 21, stroke = 0) +
  #scale_color_brewer(palette = 'YlOrRd')
  labs(y = "Taxa Aceita", x = "Data do Leilão", fill = "Duração") +
  #scale_fill_viridis_d(option = "A", direction = -1) +
  scale_fill_discrete_sequential("SunsetDark") +
  guides(fill = guide_legend(override.aes = list(size=5)),
         size = FALSE) +
  theme_bw() + facet_wrap(~SG_TITULO, scales = "free")

# para um ano específico
ggplot(data_pre %>% filter(SG_TITULO == 'LTN'), aes(
  y = VA_TAXA_ACEITA, 
  x = duracao, 
)) + 
  geom_point(alpha = .5, shape = 21, stroke = 0, fill = "slategrey") +
  #scale_color_brewer(palette = 'YlOrRd')
  labs(y = "Taxa Aceita", x = "Duração", fill = "Título") +
  guides(fill = guide_legend(override.aes = list(size=5)),
         size = FALSE) +
  theme_bw() + facet_wrap(~ano_leilao)



# taxa ao longo do tempo --------------------------------------------------

data_taxa <- data_pre %>% filter(duracao <= 2, SG_TITULO == 'LTN', DT_LEILAO>='2006-01-01') %>%
  group_by(mes_ano) %>%
  summarise(taxa = mean(VA_TAXA_ACEITA)) %>%
  ungroup() %>%
  mutate(mes = ymd(paste(str_sub(mes_ano, 1, 4), str_sub(mes_ano, 5, 6), '01', sep='-')))

ggplot(data_taxa) + geom_line(aes(x = mes, y = taxa, group = 1), size = 1) +
  scale_x_date(date_breaks = "1 years", 
               date_labels = "%Y", 
               limits = c(as.Date("2006-01-01"), NA), #"1997-12-01"
               expand = expand_scale(mult = c(.04, .04))) +
  coord_cartesian(clip = 'off') + 
  labs(x = NULL, y = NULL) +
  theme_minimal() +
  theme(
    text = element_text(family = "Inter", colour = "grey20"),
    axis.text = element_text(family = "Inter Light", face = "plain", colour = "grey20", size = 14),
    title = element_text(family = "Inter", face = "bold", size = 16), # size para o Shiny
    plot.subtitle = element_text(family = "Inter", face = "plain", size = 20, color = "#1E4C7A"),
    plot.caption = element_text(face = "italic"),
    panel.grid.major = element_blank(), 
    panel.grid.minor = element_blank(),
    legend.text = element_text(size = 18),
    legend.title = element_text(size = 18),
    axis.ticks = element_line(size = 0.5),
    axis.ticks.length = unit(.25, "cm"),
    axis.title = element_text(size = 16),
    legend.position = 'bottom') +
  theme(legend.position = 'none',
        panel.grid.major.y = element_blank(),
        panel.grid.major.x = element_blank(),
        plot.background = element_rect(color = "#f0f5f7", linetype = "solid", size = 2))

ggsave('taxa.png', plot=last_plot(), width = 16, height = 6)

# export ------------------------------------------------------------------

library(jsonlite)

write_json(data_pre %>% select(
  DT_LEILAO,
  VA_TAXA_ACEITA, 
  VA_FINANCEIRO_ACEITO, 
  acum,
  SG_TITULO, 
  duracao, 
  faixa_duracao, 
  ano_leilao), '../data.json')
