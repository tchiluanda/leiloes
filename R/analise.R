library(tidyverse)
library(lubridate)

data_raw <- read.csv2('./dados-entrada/Historico_leiloes.csv', skip = 5)

data_pre <- data_raw %>%
  mutate_at(vars(
    Maturity.Date, 
    Auction.Date), ~lubridate::dmy(.)) %>%
  mutate_at(vars(
    Quantity.Tendered, 
    Quantity.Accepted, 
    Total.Amount.Accepted..R..), ~as.numeric(str_replace(string = str_replace_all(., '\\.', ''), pattern = ",", replacement = ".")))

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
  color = Bond.Type
  #color = lubridate::year(Maturity.Date)
  )) + 
  geom_point(alpha = .5, shape = 20)

graf_dataXjuros + facet_wrap(~Bond.Type)


# Ideias ------------------------------------------------------------------

#Usar year(Maturity.Date) num gif?
