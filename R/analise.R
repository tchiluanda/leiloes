library(tidyverse)
library(lubridate)
library(RColorBrewer)
library(viridis)
library(colorspace)

data_raw <- read.csv2('./dados-entrada/Historico_leiloes.csv', skip = 5)

data_pre <- data_raw %>%
  mutate_at(vars(
    Maturity.Date, 
    Auction.Date), ~lubridate::dmy(.)) %>%
  mutate_at(vars(
    Quantity.Tendered, 
    Quantity.Accepted, 
    Total.Amount.Accepted..R..), ~as.numeric(str_replace(string = str_replace_all(., '\\.', ''), pattern = ",", replacement = "."))) %>%
  mutate(duracao = interval(Auction.Date, Maturity.Date)/years(1),
         faixa_duracao = cut(duracao, 
                             breaks = c(0, 1, 2, 5, 10, 20, 30, 50),
                             labels = c('até 1 ano', '1 a 2', '2 a 5', '5 a 10', '10 a 20', '20 a 30', '30 e acima')))

# data leilão x data vencimento
ggplot(data_pre, aes(
  y = Maturity.Date, 
  x = Auction.Date, 
  size = Total.Amount.Accepted..R..,
  color = Bond.Type)) + 
  geom_point()

# data leilão x juros aceite
graf_dataXjuros <- ggplot(data_pre, aes(
  y = Accepted.Rate, 
  x = Auction.Date, 
  size = Total.Amount.Accepted..R..,
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

graf_dataXjuros + facet_wrap(~Bond.Type, scales = "free")


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
