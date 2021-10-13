library(tidyverse)
library(lubridate)
library(RColorBrewer)
library(viridis)
library(colorspace)
library(readxl)

data_leilao_raw <- read_excel('./dados-entrada/_LEILOES/LEILAO.xlsx')
data_titulo_raw <- read_excel('./dados-entrada/_LEILOES/LEILAO_VENCIMENTO_TITULO.xlsx')

data_raw <- data_titulo_raw %>%
  left_join(data_leilao_raw)

data_pre <- data_raw %>%
  mutate_at(vars(starts_with('DT_')), ~lubridate::dmy(.)) %>%
  mutate(duracao = interval(DT_LEILAO, DT_VENCIMENTO_TITULO)/years(1),
         faixa_duracao = cut(duracao, 
                             breaks = c(0, 1, 2, 5, 10, 20, 30, 50),
                             labels = c('até 1 ano', '1 a 2', '2 a 5', '5 a 10', '10 a 20', '20 a 30', '30 e acima')))

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

graf_dataXjuros + facet_wrap(~ID_TITULO, scales = "free")


# sumarios ----------------------------------------------------------------

ggplot(data_pre, aes(y = Bond.Type, x = Total.Amount.Accepted..R..)) + geom_col()

#valores totais por ano, por título
ggplot(data_pre, 
       aes(
         x = year(Auction.Date), 
         y = Total.Amount.Accepted..R.., 
         fill = Bond.Type
         )) + 
  geom_col() +
  labs(x = "Ano do Leilão", y = "Valor total", fill = "Tipo de título") + 
  scale_y_continuous(labels = function(x) {paste(format(round(x/1e9)), "bi")}) +
  scale_fill_brewer(palette = "Set2") +
  facet_wrap(~Bond.Type)


# stats -------------------------------------------------------------------

data_pre$duracao %>% summary()

ggplot(data_pre) + geom_histogram(aes(x = duracao), bins = 100) +
  facet_wrap(~Bond.Type)



# Ideias ------------------------------------------------------------------

#Usar year(Maturity.Date) num gif?
